const MYMODEL_ATTRIBUTION_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'fbclid', 'li_fat_id'
];

function mymodelTrack(eventName, properties = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, {
    ...properties,
    transport_type: 'beacon'
  });
}

function mymodelCarryAttribution(link) {
  const current = new URL(window.location.href);
  const target = new URL(link.href, current);
  const isInternal = target.origin === current.origin;
  const isCalendly = target.hostname === 'calendly.com';
  if (!isInternal && !isCalendly) return;

  let changed = false;
  MYMODEL_ATTRIBUTION_PARAMS.forEach((name) => {
    const value = current.searchParams.get(name);
    if (value && !target.searchParams.has(name)) {
      target.searchParams.set(name, value);
      changed = true;
    }
  });
  if (changed) link.href = target.toString();
}

function mymodelLinkType(link) {
  const target = new URL(link.href, window.location.href);
  if (target.hostname === 'calendly.com') return 'book_partnership';
  if (target.protocol === 'mailto:') return 'email_contact';
  if (target.pathname.includes('pilot-one-pager')) return 'pilot_overview';
  if (target.pathname.includes('pilot-access')) return 'pilot_details';
  if (target.hash && target.pathname === window.location.pathname) return 'page_anchor';
  if (target.origin === window.location.origin) return 'internal_navigation';
  return 'outbound';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href]').forEach(mymodelCarryAttribution);
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const linkType = mymodelLinkType(link);
  const target = new URL(link.href, window.location.href);
  const safeDestination = target.protocol === 'mailto:' ? 'email' : target.href;
  const properties = {
    link_type: linkType,
    link_text: link.textContent.trim().replace(/\s+/g, ' ').slice(0, 100),
    link_url: safeDestination,
    page_path: window.location.pathname
  };

  mymodelTrack('funnel_link_clicked', properties);
  if (linkType === 'book_partnership') {
    mymodelTrack('book_partnership', properties);
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('button[onclick*="window.print"]')) return;
  mymodelTrack('pilot_overview_printed', {
    page_path: window.location.pathname
  });
});

document.addEventListener('submit', (event) => {
  const form = event.target.closest('form');
  if (!form) return;
  mymodelTrack('form_submit_attempted', {
    form_id: form.id || 'unnamed_form',
    page_path: window.location.pathname
  });
});
