window.addEventListener('DOMContentLoaded', function () {
  function privacySettings() {
    const element = document.querySelector('.privacy-manager');

    if (!element) return;

    const privacyManager = new PrivacyManager({
      saveAsCookie: true,
      form: document.getElementById('privacy-manager'),
      on: {
        update: (payload) => console.log('Updated', payload),
      },
      items: [
        {
          name: 'functional',
          onAction: (item) => console.log('Action', item),
          checked: true,
        },
        {
          name: 'analytical',
          onApprove: (item) => console.log('Approve', item),
          onDeny: (item) => console.log('Deny', item),
          checked: true,
        },
        {
          name: 'targeting',
          onApprove: (item) => console.log('Approve', item),
          onDeny: (item) => console.log('Deny', item),
          checked: false,
        },
      ],
    });

    const restore = document.querySelector('.restore');
    restore.addEventListener('click', privacyManager.restoreDefaults, false);
  }

  privacySettings();
});
