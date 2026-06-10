import { useEffect } from "react";

function Toast({ toast, onDismiss }) {
    useEffect(() => {
        if (!toast) return;

        const timer = setTimeout(onDismiss, 2500);
        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    if (!toast) return null;

    return (
        <div className="toast-container">
            <div className="toast" key={toast.id}>
                {toast.message}
            </div>
        </div>
    );
}

export default Toast;
