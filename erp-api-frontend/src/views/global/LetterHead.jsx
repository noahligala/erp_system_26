import React from "react";

export default function LetterHead() {
  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: "15px",
        fontFamily: "'Source Sans 3', sans-serif",
      }}
    >
      <img
        src="https://via.placeholder.com/120x120.png?text=LOGO"
        alt="Company Logo"
        style={{
          width: "70px",
          height: "70px",
          objectFit: "contain",
          marginBottom: "5px",
        }}
      />
      <h2
        style={{
          margin: "0",
          fontSize: "18px",
          letterSpacing: "1px",
          color: "#1a1a1a",
        }}
      >
        LIGCO TECHNOLOGIES
      </h2>
      <p
        style={{
          margin: "4px 0",
          fontSize: "12px",
          color: "#444",
          lineHeight: "1.4",
        }}
      >
        Tel: 0725611832 | Email: example@ligco.tech <br />
        Website: www.ligco.tech
      </p>

      <hr
        style={{
          margin: "10px 0",
          border: "none",
          borderTop: "1px solid rgba(0, 0, 0, 0.15)",
        }}
      />
    </div>
  );
}
