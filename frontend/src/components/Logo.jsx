import "./Logo.css";
import { LogoMarkA, LogoMarkB, LogoMarkC, LogoMarkD } from "./LogoMarks";


const ActiveMark = LogoMarkC;

function Logo({ size = 56, showWordmark = true }) {
  return (
    <div className="geovolt-logo" data-testid="app-logo">
      <div className="geovolt-logo__mark" style={{ width: size, height: size }}>
        <span className="geovolt-logo__pulse" aria-hidden="true" />
        <ActiveMark size={size} />
      </div>
      {showWordmark && <span className="geovolt-logo__wordmark">GeoVolt</span>}
    </div>
  );
}

export default Logo;