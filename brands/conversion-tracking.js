document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="https://calendly.com/jordan-getmymodel/mymodellink"]');
  if (!link || typeof window.gtag !== 'function') return;

  window.gtag('event', 'book_partnership', {
    link_url: link.href,
    page_location: window.location.href,
    transport_type: 'beacon'
  });
});
