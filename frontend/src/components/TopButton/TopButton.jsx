import { useEffect, useState } from "react";
import "./TopButton.css";

export function TopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      className={`top-button ${visible ? "show" : ""}`}
      onClick={scrollToTop}
      aria-label="Remonter en haut de la page"
    >
      ↑
    </button>
  );
}