import React from "react";

export default function Header() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "16px 0",
      }}
    >
      <img
        src="/Acrosticism_Logo.png"
        alt="Acrosticism"
        style={{
          maxWidth: "500px",
          height: "auto",
        }}
      />
    </div>
  );
}