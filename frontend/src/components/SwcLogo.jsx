export default function SwcLogo({ className = '', label = 'SWC', src = '/swc-logo.svg', showFire = true }) {
  return (
    <span className={`swc-logo ${className}`.trim()} role="img" aria-label={label}>
      <img className="swc-logo-base" src={src} alt="" aria-hidden="true" />
      {showFire ? <span className="swc-logo-fire" aria-hidden="true" /> : null}
    </span>
  );
}
