import React from "react";

export default function ProfilePanel({ profile }: { profile: any }) {
  return (
    <div style={{
      marginTop: 16,
      padding: 12,
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      background: "#0b1220",
      color: "#e2e8f0"
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>📇 Current Profile</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
        {JSON.stringify(profile ?? {}, null, 2)}
      </pre>
    </div>
  );
}
