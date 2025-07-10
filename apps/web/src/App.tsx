import { useEffect, useState } from 'react';

export default function App() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch('/api/ping')
      .then((r) => r.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('error'));
  }, []);

  const statusColor =
    status === 'ok' ? 'text-astronomyGreen' : status === 'error' ? 'text-astronomyRed' : 'text-astronomyOrange';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-textPrimary">
      <h1 className="text-4xl font-bold mb-4">AirAstro</h1>
      <p className="text-lg text-textSecondary mb-8">
        Server status: <span className={statusColor}>{status}</span>
      </p>
    </div>
  );
}
