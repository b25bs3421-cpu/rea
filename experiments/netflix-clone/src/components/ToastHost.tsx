import { useApp } from '../state/AppContext';
import { CloseIcon } from './Icons';

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span>{toast.message}</span>
          <button type="button" className="toast__close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            <CloseIcon size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
