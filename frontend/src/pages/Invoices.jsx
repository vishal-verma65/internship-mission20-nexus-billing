import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listInvoices } from '../api.js';
import { formatDate, formatMoney } from '../format.js';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    listInvoices()
      .then((data) => active && setInvoices(data))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="muted">Loading invoices...</p>;
  }

  if (error) {
    return <p className="alert alert-error">{error}</p>;
  }

  return (
    <section>
      <h1>Your invoices</h1>

      {invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : (
        <div className="grid">
          {invoices.map((invoice) => (
            <Link key={invoice._id} to={`/invoices/${invoice._id}`} className="card invoice-card">
              <div className="row">
                <strong>{invoice.invoiceNumber}</strong>
                <span className={`badge badge-${invoice.status.toLowerCase()}`}>{invoice.status}</span>
              </div>
              <p className="amount">{formatMoney(invoice.amount, invoice.currency)}</p>
              <p className="muted">Issued {formatDate(invoice.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
