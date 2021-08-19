import React from "react";
import random from "lodash.random";

const Bold: React.FC = ({ children }) => {
  return <b id={random()}>{children}</b>;
};

export default Bold;
