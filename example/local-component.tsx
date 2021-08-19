import React from "react";
import Bold from "./inner/component";

export const Button: React.FC = ({ children }) => {
  return (
    <button>
      <Bold>{children}</Bold>
    </button>
  );
};
