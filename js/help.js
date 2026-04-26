document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("whatsappBtn");

  if (btn) {
    btn.onclick = () => {
      window.open("https://wa.me/61431859673", "_blank");
    };
  }

});