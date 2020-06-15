class PrivacyManager {
  constructor(userProps = {}) {
    this.defaults = {
      expDays: 'Thu, 01 Jan 1970 00:00:00 GMT', // used to set expiry for cookies
      saveAsCookie: true, // if true - cookies used instead of local storage
      cookieExp: 365, // days till expiry ( cookie only )
      savePreferences: true, // save set preferences in local storage or not?
      key: 'privacy-preferences', // key for local storage
      form: null, // DOM object
      on: {
        init: null,
        update: null,
        restore: null,
      },
      items: [], // {name = str, onApprove = func, onDeny = func, onAction = func checked=bool //default state}
    };
    this.props = this.mergeDeep(this.defaults, userProps);
    this.savedPreferences = [];

    // No point continuing if you dont have a form
    const form = this.props.form;
    if (!(form instanceof Element) || !form)
      throw new Error('"form" should be DOM object');

    // Bind this
    this.init = this.init.bind(this);
    this.updateFromSave = this.updateFromSave.bind(this);
    this.updatePreferences = this.updatePreferences.bind(this);
    this.updateSaved = this.updateSaved.bind(this);
    this.perfomAction = this.performAction.bind(this);
    this.restoreDefaults = this.restoreDefaults.bind(this);
    this.fetchCookies = this.fetchCookies.bind(this);
    this.addCookie = this.addCookie.bind(this);
    this.getCookie = this.getCookie.bind(this);
    this.deleteCookie = this.deleteCookie.bind(this);
    this.payload = this.payload.bind(this);

    this.formatted = this.fetchCookies();
    this.init();
  }

  init() {
    const savedCookie = this.getCookie(this.props.key);
    const savedStorage = localStorage.getItem(this.props.key);

    if (this.props.saveAsCookie) {
      this.savedPreferences = savedCookie
        ? JSON.parse(savedCookie.content)
        : [];

      if (savedStorage) localStorage.removeItem(this.props.key);
    }

    if (!this.props.saveAsCookie) {
      this.savedPreferences = savedStorage ? JSON.parse(savedStorage) : [];
      if (savedCookie) this.deleteCookie(this.props.key);
    }

    const form = this.props.form;
    form.addEventListener('submit', this.updatePreferences, false);

    const savedPref = this.savedPreferences;

    if (savedPref.length > 0) this.updateFromSave();
    this.updatePreferences();

    // init on.init
    this.payload(this.props.on.init);
  }

  updateFromSave() {
    const form = this.props.form;
    const saved = this.savedPreferences;

    saved.forEach((savedItem) => {
      let item = form[savedItem.name];
      if (item) {
        item.checked = savedItem.checked;
      }
    });
  }

  payload(func) {
    const isCookie = this.props.saveAsCookie;

    const data = isCookie
      ? this.getCookie(this.props.key)
      : localStorage.getItem(this.props.key);

    let result = null;

    if (data) result = isCookie ? data.content : data;

    const payload = {
      form: this.props.form,
      id: this.props.key,
      data: result ? JSON.parse(result) : [],
    };

    if (func) func(payload);
  }

  updatePreferences(e) {
    if (e) e.preventDefault();
    const form = this.props.form;
    this.savedPreferences = [];
    this.props.items.forEach((item) => {
      let name = item.name;
      if (name && form[name]) this.performAction(form[name].checked, item);
    });
    if (this.props.savePreferences) this.updateSaved();

    // init on update
    this.payload(this.props.on.update);
  }

  updateSaved() {
    const cookieExp = this.props.cookieExp;
    const key = this.props.key;

    if (this.props.saveAsCookie) {
      this.addCookie(key, JSON.stringify(this.savedPreferences), cookieExp);
    } else {
      localStorage.setItem(key, JSON.stringify(this.savedPreferences));
    }
  }

  performAction(checked, config) {
    const isChecked = checked || false;
    const onApprove = config.onApprove;
    const onDeny = config.onDeny;
    const name = config.name;

    const item = {
      name: name,
      checked: isChecked,
    };

    this.savedPreferences.push(item);

    if (isChecked) {
      if (onApprove) onApprove(item);
    } else {
      if (onDeny) onDeny(item);
    }

    if (config.onAction) config.onAction(item);
  }

  restoreDefaults() {
    const form = this.props.form;
    const items = this.props.items;

    if (this.props.saveAsCookie) {
      this.deleteCookie(this.props.key);
    } else {
      localStorage.removeItem(this.props.key);
    }

    const preferences = [];

    items.forEach((item) => {
      let checkbox = form[item.name];
      if (checkbox) {
        let output = {
          name: item.name,
          checked: item.checked,
        };
        preferences.push(output);
        checkbox.checked = item.checked;
        this.performAction(form[item.name].checked, item);
      }
    });

    this.savedPreferences = preferences;

    if (this.props.savePreferences) this.updateSaved();

    // init on restore
    this.payload(this.props.on.restore);
  }

  fetchCookies() {
    let cookies = document.cookie.split(';');
    let result = [];

    cookies.forEach((cookie) => {
      let src = cookie.trim();

      // Name
      let cookieName = src.split('=')[0];

      // Content
      let cookieContent = src.split('=');
      cookieContent.shift();
      cookieContent = cookieContent.join('=');

      // let cookie formatting
      let formatted = {
        name: cookieName,
        content: cookieContent,
      };

      result.push(formatted);
    });

    return result;
  }

  addCookie(name, content, expDays = 365, props = '') {
    if (!name || !content) return this;

    const d = new Date();
    d.setTime(d.getTime() + expDays * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${content};expires=${d.toUTCString()};${props}path=/`;

    this.formatted = this.fetchCookies();

    return this;
  }

  getCookie(name = '') {
    const arr = this.formatted;
    const result = arr.filter((item) => item.name === name);

    if (result.length === 0) return null;

    return result[0];
  }

  deleteCookie(name = '') {
    const target = this.getCookie(name);
    if (!target) return null;
    document.cookie = `${target.name}='';expires=${this.props.expDays};path=/`;
    this.formatted = this.fetchCookies();
    return target;
  }

  // Getter
  get getProps() {
    return this.props;
  }

  mergeDeep(target, source) {
    function isObject(item) {
      return (
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        item !== null
      );
    }

    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (isObject(source[key])) {
          if (!target[key] || !isObject(target[key])) {
            target[key] = source[key];
          }
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      });
    }
    return target;
  }
}
