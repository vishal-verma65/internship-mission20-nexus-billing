import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { downloadReceipt, getInvoice, resendReceipt, startCheckout } from '../api.js';
import { formatDate, formatMoney } from '../format.js';

const POLL_INTERVAL = 2000;
const MAX_POLLS = 10;

export default function InvoiceDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const paymentResult = searchParams.get('payment');
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let active = true;
    let polls = 0;
    let timer;

    const load = async () => {
      try {
        const data = await getInvoice(id);
        if (!active) return;

        setInvoice(data);
        setError('');

        if (paymentResult === 'success' && data.status !== 'Paid' && polls < MAX_POLLS) {
          polls += 1;
          timer = setTimeout(load, POLL_INTERVAL);
        }
      } catch (err) {
        if (active) {
          setError(err.status === 403 ? 'You do not have access to this invoice' : err.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, paymentResult]);

  const run = async (name, action) => {
    setBusy(name);
    setNotice('');
    setError('');

    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const handlePay = () =>
    run('pay', async () => {
      const { url } = await startCheckout(id);
      window.location.assign(url);
    });

  const handleDownload = () =>
    run('download', () => downloadReceipt(id, `${invoice.invoiceNumber}-receipt.pdf`));

  const handleResend = () =>
    run('resend', async () => {
      await resendReceipt(id);
      setNotice(`Receipt sent to ${invoice.clientEmail}`);
    });

  if (loading) {
    return <p className="muted">Loading invoice...</p>;
  }

  if (!invoice) {
    return (
      <>
        <p className="alert alert-error">{error}</p>
        <Link to="/" className="back-link">
          Back to invoices
        </Link>
      </>
    );
  }

  const isPaid = invoice.status === 'Paid';

  return (
    <section>
      <Link to="/" className="back-link">
        Back to invoices
      </Link>

      {paymentResult === 'success' && (
        <p className={`alert ${isPaid ? 'alert-success' : 'alert-info'}`}>
          {isPaid
            ? 'Payment received. Your receipt has been emailed to you.'
            : 'Payment received. Confirming your invoice...'}
        </p>
      )}
      {paymentResult === 'cancelled' && !isPaid && (
        <p className="alert alert-info">Payment was cancelled. You can try again below.</p>
      )}
      {notice && <p className="alert alert-success">{notice}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <div className="card">
        <div className="row">
          <h1>{invoice.invoiceNumber}</h1>
          <span className={`badge badge-${invoice.status.toLowerCase()}`}>{invoice.status}</span>
        </div>

        <dl className="meta">
          <div>
            <dt>Billed to</dt>
            <dd>{invoice.clientName}</dd>
            <dd className="muted">{invoice.clientEmail}</dd>
          </div>
          <div>
            <dt>Issued</dt>
            <dd>{formatDate(invoice.createdAt)}</dd>
          </div>
          {invoice.paidAt && (
            <div>
              <dt>Paid on</dt>
              <dd>{formatDate(invoice.paidAt)}</dd>
            </div>
          )}
        </dl>

        <ul className="items">
          {invoice.items.map((item, index) => (
            <li key={`${item.description}-${index}`}>
              <div>
                <strong>{item.description}</strong>
                <p className="muted">
                  {item.quantity} × {formatMoney(item.unitAmount, invoice.currency)}
                </p>
              </div>
              <span>{formatMoney(item.unitAmount * item.quantity, invoice.currency)}</span>
            </li>
          ))}
        </ul>

        <div className="total">
          <span>Total</span>
          <span>{formatMoney(invoice.amount, invoice.currency)}</span>
        </div>

        <div className="actions">
          {isPaid ? (
            <>
              <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={Boolean(busy)}>
                {busy === 'download' ? 'Downloading...' : 'Download receipt'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleResend} disabled={Boolean(busy)}>
                {busy === 'resend' ? 'Sending...' : 'Email receipt again'}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handlePay} disabled={Boolean(busy)}>
              {busy === 'pay' ? 'Redirecting...' : invoice.status === 'Failed' ? 'Try payment again' : 'Pay now'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
