function Button({ children, variant = "default", className = "", ...props }) {
    return (
        <button className={`btn btn-${variant} ${className}`} {...props}>
            {children}
        </button>
    );
}

export default Button;
