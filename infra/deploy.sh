#!/usr/bin/env bash
# Creates the Azure infrastructure for the EMS: a VNet with an NSG, a static public IP with a DNS name,
# one Ubuntu VM with a managed identity, and a Key Vault holding the app's secrets. Safe to re-run.
#
#   SUFFIX=arnav08f8 MONGO_URI='mongodb+srv://...' ./infra/deploy.sh
set -euo pipefail

RG=${RG:-ems-rg}
LOC=${LOC:-centralindia}
SIZE=${SIZE:-Standard_B2ats_v2}
SUFFIX=${SUFFIX:?set SUFFIX to a short unique string, e.g. arnav08f8}
: "${MONGO_URI:?export MONGO_URI first}"
KV=ems-kv-$SUFFIX
DNS=ems-$SUFFIX
VM=ems-vm
ADMIN_IP=${ADMIN_IP:-$(curl -fsS https://api.ipify.org)}   # only this IP may SSH in
HERE=$(cd "$(dirname "$0")" && pwd)

echo "== Resource group"
az group create -n "$RG" -l "$LOC" -o none

echo "== Network: VNet, subnet, NSG"
az network vnet create -g "$RG" -n ems-vnet --address-prefix 10.10.0.0/16 \
  --subnet-name snet-app --subnet-prefix 10.10.1.0/24 -o none
az network nsg create -g "$RG" -n ems-nsg -o none
az network nsg rule create -g "$RG" --nsg-name ems-nsg -n Allow-HTTP --priority 100 \
  --access Allow --protocol Tcp --direction Inbound --destination-port-ranges 80 -o none
az network nsg rule create -g "$RG" --nsg-name ems-nsg -n Allow-HTTPS --priority 110 \
  --access Allow --protocol Tcp --direction Inbound --destination-port-ranges 443 -o none
az network nsg rule create -g "$RG" --nsg-name ems-nsg -n Allow-SSH-Admin --priority 120 \
  --access Allow --protocol Tcp --direction Inbound --destination-port-ranges 22 \
  --source-address-prefixes "$ADMIN_IP/32" -o none
az network vnet subnet update -g "$RG" --vnet-name ems-vnet -n snet-app --network-security-group ems-nsg -o none

echo "== Public IP"
az network public-ip create -g "$RG" -n ems-pip --sku Standard --allocation-method Static \
  --dns-name "$DNS" -o none
FQDN=$(az network public-ip show -g "$RG" -n ems-pip --query dnsSettings.fqdn -o tsv)

echo "== Key Vault + secrets"
az keyvault show -n "$KV" -o none 2>/dev/null ||
  az keyvault create -g "$RG" -n "$KV" -l "$LOC" --enable-rbac-authorization true -o none
KV_ID=$(az keyvault show -n "$KV" --query id -o tsv)
ME=$(az ad signed-in-user show --query id -o tsv)
az role assignment create --assignee-object-id "$ME" --assignee-principal-type User \
  --role "Key Vault Secrets Officer" --scope "$KV_ID" -o none
# Role assignments take a minute to apply; retry the first write until it does.
for i in $(seq 1 20); do
  az keyvault secret set --vault-name "$KV" -n mongo-uri --value "$MONGO_URI" -o none 2>/dev/null && break
  sleep 15
done
az keyvault secret show --vault-name "$KV" -n session-secret -o none 2>/dev/null ||
  az keyvault secret set --vault-name "$KV" -n session-secret --value "$(openssl rand -hex 32)" -o none

echo "== VM"
INIT=$(mktemp)
sed -e "s/__KEYVAULT__/$KV/" -e "s/__FQDN__/$FQDN/" "$HERE/cloud-init.yaml" > "$INIT"
az vm show -g "$RG" -n "$VM" -o none 2>/dev/null ||
  az vm create -g "$RG" -n "$VM" --image Ubuntu2404 --size "$SIZE" \
    --vnet-name ems-vnet --subnet snet-app --nsg "" --public-ip-address ems-pip \
    --admin-username azureuser --generate-ssh-keys \
    --storage-sku StandardSSD_LRS --os-disk-size-gb 30 \
    --assign-identity '[system]' --custom-data "$INIT" -o none
rm -f "$INIT"
VM_PRINCIPAL=$(az vm show -g "$RG" -n "$VM" --query identity.principalId -o tsv)
az role assignment create --assignee-object-id "$VM_PRINCIPAL" --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope "$KV_ID" -o none

echo "Done. App URL (after ./infra/release.sh): https://$FQDN"
