// src/components/BackgroundDecor.jsx
import "./BackgroundDecor.css";
import { BoltIcon, PlugIcon, CarIcon, CircuitIcon } from "./DecorIcons";

const shapes = [
  { Icon: BoltIcon, top: "8%", left: "10%", size: 60, rotate: -15, opacity: 0.16 },
  { Icon: BoltIcon, top: "16%", left: "86%", size: 44, rotate: 18, opacity: 0.18 },
  { Icon: PlugIcon, top: "74%", left: "6%", size: 52, rotate: 8, opacity: 0.14 },
  { Icon: PlugIcon, top: "12%", left: "48%", size: 40, rotate: -10, opacity: 0.12 },
  { Icon: CarIcon, top: "80%", left: "72%", size: 130, rotate: 0, opacity: 0.12 },
  { Icon: CircuitIcon, top: "42%", left: "4%", size: 84, rotate: 0, opacity: 0.14 },
  { Icon: CircuitIcon, top: "30%", left: "90%", size: 70, rotate: 200, opacity: 0.12 },
];

function BackgroundDecor() {
  return (
    <div className="bg-decor" aria-hidden="true">
      <span className="bg-decor__blob bg-decor__blob--amber" />
      <span className="bg-decor__blob bg-decor__blob--teal" />
      {shapes.map(({ Icon, top, left, size, rotate, opacity }, i) => (
        <span
          key={i}
          className="bg-decor__icon"
          style={{ top, left, width: size, height: size, opacity, transform: `rotate(${rotate}deg)` }}
        >
          <Icon />
        </span>
      ))}
    </div>
  );
}

export default BackgroundDecor;