import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

const JWT_PATTERN = /^[\w-]+\.[\w-]+\.[\w-]+$/;

export default function Login() {
  const { login } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const token = value.trim();

    if (!JWT_PATTERN.test(token)) {
      setError('Enter a valid JWT');
      return;
    }

    login(token);
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Nexus Billing</h1>
        <p className="muted">Paste your access token to view your invoices.</p>

        <label htmlFor="token">Access token</label>
        <textarea
          id="token"
          rows="6"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
          }}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          spellCheck="false"
        />

        {error && <p className="alert alert-error">{error}</p>}

        <button type="submit" className="btn btn-primary">
          Continue
        </button>
      </form>
    </div>
  );
}
