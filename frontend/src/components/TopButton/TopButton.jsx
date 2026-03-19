import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";
import "./TopButton.css";

export function TopButton() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const pageHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;

      const scrolled = pageHeight > 0 ? (scrollTop / pageHeight) * 100 : 0;

      setProgress(scrolled);
      setVisible(scrollTop > 220);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * progress) / 100;

  return (
    <div className={`top-btn-wrapper ${visible ? "show" : ""}`}>
      <button
        className="top-btn"
        onClick={scrollToTop}
        aria-label="Retour en haut"
        type="button"
      >
        <svg className="top-btn__progress" viewBox="0 0 64 64" aria-hidden="true">
          <circle className="top-btn__progress-bg" cx="32" cy="32" r={radius} />
          <circle
            className="top-btn__progress-value"
            cx="32"
            cy="32"
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
            }}
          />
        </svg>

        <span className="top-btn__inner">
          <FaArrowUp className="top-btn__icon" />
        </span>
      </button>

      <span className="top-btn__tooltip">Retour en haut</span>
    </div>
  );
}