import styled from "styled-components";

const Button = styled.button`
  border: 1px solid blue;
  background: white;
  border-radius: 4px;
  font-weight: italic;
  color: ${(props) => props.theme.colors.primary};
`;

export default Button;
