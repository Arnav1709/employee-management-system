#!/usr/bin/env bash
# Ships the committed code (HEAD) to the VM, builds it there and restarts the app.
# On the first run it also gets a free Let's Encrypt HTTPS certificate.
#
#   ./infra/release.sh
set -euo pipefail

RG=${RG:-ems-rg}
FQDN=$(az network public-ip show -g "$RG" -n ems-pip --query dnsSettings.fqdn -o tsv)
SSH="ssh -o StrictHostKeyChecking=accept-new azureuser@$FQDN"

git archive --format=tar.gz -o /tmp/ems-release.tar.gz HEAD
scp -o StrictHostKeyChecking=accept-new /tmp/ems-release.tar.gz "azureuser@$FQDN:/tmp/"

$SSH "FQDN=$FQDN bash -s" <<'EOF'
set -euo pipefail
cloud-init status --wait >/dev/null || true   # exits 2 on harmless warnings
sudo rm -rf /opt/ems/*
sudo tar -xzf /tmp/ems-release.tar.gz -C /opt/ems
sudo chown -R ems:ems /opt/ems
sudo -u ems -H bash -c 'cd /opt/ems && npm run build'
sudo systemctl restart ems
sudo test -d "/etc/letsencrypt/live/$FQDN" ||
  sudo certbot --nginx -d "$FQDN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
EOF

echo "Released: https://$FQDN"
