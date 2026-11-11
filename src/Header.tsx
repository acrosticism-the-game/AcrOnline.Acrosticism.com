import React from "react";

type HeaderProps = {
  compact?: boolean;
};

export default function Header({ compact = false }: HeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: compact ? "4px 0" : "16px 0",
      }}
    >
      <img
        src="/Acrosticism_Logo.png"
        alt="Acrosticism"
        style={{
          maxWidth: compact ? "200px" : "500px",
          height: "auto",
        }}
      />
    </div>
  );
}