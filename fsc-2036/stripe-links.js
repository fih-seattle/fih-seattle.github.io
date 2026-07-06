window.FIH_STRIPE_PAYMENT_LINKS = {
  individual: "",
  team: "",
};

document.querySelectorAll("[data-stripe-payment-link]").forEach((link) => {
  const key = link.getAttribute("data-stripe-payment-link");
  const paymentUrl = window.FIH_STRIPE_PAYMENT_LINKS[key];

  if (!paymentUrl || !paymentUrl.startsWith("https://")) {
    return;
  }

  link.href = paymentUrl;
  link.textContent = "Pay with Stripe";
  link.classList.remove("button-disabled");
  link.classList.add("button-primary");
  link.removeAttribute("aria-disabled");
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener");
});
