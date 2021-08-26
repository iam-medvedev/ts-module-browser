document.addEventListener("ts-module-browser-init", () => {
  console.info("[preloader events] ts-module-browser-init");
});

document.addEventListener("ts-module-browser-error", (e) => {
  console.error("[preloader events] ts-module-browser-error", e.detail);

  document.getElementById("preloader").remove();

  const errorSpan = document.createElement("span");
  errorSpan.innerHTML = e.detail;
  document.body.appendChild(errorSpan);
});

document.addEventListener("ts-module-browser-success", () => {
  console.info("[preloader events] ts-module-browser-success");

  document.getElementById("preloader").remove();
});
