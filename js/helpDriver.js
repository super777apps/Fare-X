// WhatsApp button logic

document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("whatsappBtn");

  if (btn) {
    btn.onclick = () => {

      const phone = "61431859673"; // remove + and spaces
      const message = encodeURIComponent(
        "Hello Fare-X Support, I need help with my driver account."
      );

      const url = `https://wa.me/${phone}?text=${message}`;

      window.open(url, "_blank");
    };
  }

});