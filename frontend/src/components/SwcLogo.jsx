export default function SwcLogo({ className = '', label = 'SWC' }) {
  return (
    <span className={`swc-logo ${className}`.trim()} role="img" aria-label={label}>
      <img className="swc-logo-base" src="/swc-logo.svg" alt="" aria-hidden="true" />
      <span className="swc-logo-fire" aria-hidden="true" />
    </span>
  );
}
