import { useEffect, useState } from 'react';
import { get } from '../../api';
import { Empty, fmt } from '../../ui';

const DOC_TYPES = { offer_letter: 'Offer Letter', id_proof: 'ID Proof', certificate: 'Certificate', salary_slip: 'Salary Slip', other: 'Other' };

export default function MyDocuments() {
  const [docs, setDocs] = useState(null);
  useEffect(() => { get('/documents').then(setDocs).catch(() => {}); }, []);

  return (
    <>
      <h1>My documents</h1>
      <div className="card mt">
        {docs?.length === 0 ? <Empty>No documents have been shared with you yet.</Empty> : (
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Uploaded</th><th></th></tr></thead>
            <tbody>
              {(docs || []).map((d) => (
                <tr key={d._id}>
                  <td><strong>{d.title}</strong></td>
                  <td>{DOC_TYPES[d.type] || d.type}</td>
                  <td>{fmt(d.createdAt?.slice(0, 10))}</td>
                  <td><a className="btn secondary small" style={{ textDecoration: 'none', lineHeight: '28px' }} href={`/api/documents/${d._id}/file`}>⬇ Download</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
