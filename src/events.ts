export enum EventType {
  Init = "ts-module-browser-init",
  Error = "ts-module-browser-error",
  Success = "ts-module-browser-success",
}

export function dispatchEvent(type: EventType, detail?: object) {
  const event = new CustomEvent(type, {
    detail,
  });

  document.dispatchEvent(event);
}
