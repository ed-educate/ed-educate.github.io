(function () {
  'use strict';

  // Адрес веб-приложения Google Apps Script
  var API = 'https://script.google.com/macros/s/AKfycby27yUEu8ULoGGK3wKwxatHXHAvU_LYVXQBFtvltLkeCbsqi0AvhgRDVC23ZodKh2893w/exec';
  var TG_USER = 'ed_educate';
  var MSK = 'Europe/Moscow';
  var MSK_OFFSET_MIN = 180;
  var REDIRECT_MS = 1800;

  var params = new URLSearchParams(window.location.search);
  var chosen = null;
  var lastSlots = [];
  var diffMin = 0; // разница человека с Москвой в минутах

  function $(id) { return document.getElementById(id); }

  function format(iso, tz, opts) {
    var o = { timeZone: tz };
    for (var k in opts) o[k] = opts[k];
    return new Intl.DateTimeFormat('ru-RU', o).format(new Date(iso));
  }
  function timeIn(iso, tz) { return format(iso, tz, { hour: '2-digit', minute: '2-digit' }); }
  function dayIn(iso, tz) {
    var s = format(iso, tz, { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function localDate(iso) {
    return new Date(new Date(iso).getTime() + (MSK_OFFSET_MIN + diffMin) * 60000);
  }
  function localTime(iso) { return timeIn(localDate(iso), 'UTC'); }
  function localDay(iso) { return dayIn(localDate(iso), 'UTC'); }
  function sameDay(iso) { return localDay(iso) === dayIn(iso, MSK); }

  function diffLabel(min) {
    if (min === 0) return 'Как в Москве';
    var abs = Math.abs(min);
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    return (min > 0 ? '+' : '−') + h + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' от Москвы';
  }

  /** Список разниц с Москвой. Сразу выбрана разница устройства, её можно поменять. */
  function fillDiff() {
    var select = $('diff');
    var device = -new Date().getTimezoneOffset() - MSK_OFFSET_MIN;
    var values = [];
    for (var h = -13; h <= 11; h++) values.push(h * 60);
    if (values.indexOf(device) === -1) values.push(device);
    values.sort(function (a, b) { return a - b; });
    values.forEach(function (min) {
      var o = el('option', '', diffLabel(min));
      o.value = String(min);
      select.appendChild(o);
    });
    select.value = String(device);
    diffMin = device;
    select.addEventListener('change', function () {
      diffMin = Number(select.value);
      if (lastSlots.length) renderSlots(lastSlots);
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function telegramLink(text) {
    return 'https://t.me/' + TG_USER + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  function showOnly(id) {
    ['pick', 'details', 'done'].forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }

  function messageBox(text, withTelegram) {
    var box = $('days');
    box.textContent = '';
    box.appendChild(el('p', 'note', text));
    if (withTelegram) {
      var a = el('a', 'btn quiet', 'Написать в Телеграм');
      a.href = telegramLink('Эд, привет! Хочу записаться на сессию.');
      a.style.marginTop = '14px';
      box.appendChild(a);
    }
  }

  /* Выбор времени */

  function renderSlots(slots) {
    lastSlots = slots;
    var box = $('days');
    box.textContent = '';

    if (!slots.length) {
      messageBox('Свободного времени на ближайшие три недели нет. Напишите мне, подберём его вместе.', true);
      return;
    }

    var group = null;
    var current = '';
    slots.forEach(function (iso) {
      var day = dayIn(iso, MSK);
      if (day !== current) {
        current = day;
        var block = el('div', 'day');
        block.appendChild(el('h3', '', day));
        group = el('div', 'times');
        block.appendChild(group);
        box.appendChild(block);
      }
      var b = el('button', 'slot');
      b.type = 'button';
      b.appendChild(el('b', '', timeIn(iso, MSK)));
      if (diffMin !== 0) {
        b.appendChild(el('span', '', localTime(iso) + ' у вас' +
          (sameDay(iso) ? '' : ', ' + format(localDate(iso), 'UTC', { day: 'numeric', month: 'short' }))));
      }
      b.addEventListener('click', function () { choose(iso); });
      group.appendChild(b);
    });
  }

  function showNotice(text) {
    $('notice').textContent = text || '';
    $('notice').hidden = !text;
  }

  function loadSlots(notice) {
    showNotice(notice);
    messageBox('Загружаю свободное время…');
    fetch(API, { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.code);
        renderSlots(d.slots);
      })
      .catch(function () {
        messageBox('Время не загрузилось. Обновите страницу или напишите мне в Телеграм.', true);
      });
  }

  /* Форма */

  function fillWhen(box, iso) {
    box.textContent = '';
    box.appendChild(el('span', 'when', dayIn(iso, MSK)));
    box.appendChild(el('span', 'big', timeIn(iso, MSK)));
    var line = 'по Москве';
    if (diffMin !== 0) {
      line += ', у вас ' + localTime(iso) + (sameDay(iso) ? '' : ' (' + localDay(iso).toLowerCase() + ')');
    }
    box.appendChild(el('span', 'when', line));
  }

  function choose(iso) {
    chosen = iso;
    fillWhen($('chosen'), iso);
    showOnly('details');
    $('chosen').focus({ preventScroll: true });
  }

  function cleanNick(v) {
    return v.trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .replace(/[/?#].*$/, '');
  }

  function validate(form) {
    if (!form.name) return ['name', 'Напишите, как вас зовут.'];
    if (form.ig && !/^[A-Za-z0-9._]{1,30}$/.test(form.ig)) {
      return ['ig', 'Проверьте ник: в Инстаграме это латинские буквы, цифры, точки и подчёркивания.'];
    }
    return null;
  }

  function showError(text, field) {
    var e = $('error');
    e.textContent = text;
    e.hidden = false;
    if (field) $(field).focus();
  }

  function source() {
    var from = (params.get('from') || '').slice(0, 40);
    if (from) return from;
    if (/Instagram/i.test(navigator.userAgent || '')) return 'Инстаграм';
    var ref = document.referrer || '';
    if (/instagram\./i.test(ref)) return 'Инстаграм';
    if (/t\.me|telegram\./i.test(ref)) return 'Телеграм';
    if (/youtu/i.test(ref)) return 'Ютуб';
    return '';
  }

  function submit(ev) {
    ev.preventDefault();
    var form = {
      name: $('name').value.trim(),
      ig: cleanNick($('ig').value)
    };

    $('error').hidden = true;
    var problem = validate(form);
    if (problem) { showError(problem[1], problem[0]); return; }

    var button = $('submit');
    button.disabled = true;
    button.textContent = 'Записываю…';

    fetch(API, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // Имя и ник на сервер не уходят: только время и источник перехода
      body: JSON.stringify({ start: chosen, source: source(), website: $('website').value })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { finish(form); return; }
        if (d.code === 'taken') {
          showOnly('pick');
          loadSlots('Это время только что заняли, выберите другое.');
          return;
        }
        if (d.code === 'pending') {
          showError('Сейчас записаться через сайт нельзя. Напишите мне в Телеграм, подберём время.');
          return;
        }
        throw new Error(d.code);
      })
      .catch(function () {
        showError('Запись не прошла. Попробуйте ещё раз или напишите мне в Телеграм.');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = 'Записаться';
      });
  }

  function finish(form) {
    var mskDay = dayIn(chosen, MSK).toLowerCase();
    var text = 'Эд, привет! Это ' + form.name + '. Запись на сессию: ' + mskDay + ', ' +
      timeIn(chosen, MSK) + ' по Москве.' + (form.ig ? ' Инстаграм: @' + form.ig + '.' : '');
    var link = telegramLink(text);

    fillWhen($('done-when'), chosen);
    $('tg').href = link;
    showOnly('done');
    $('done-title').focus({ preventScroll: true });
    window.setTimeout(function () { window.location.href = link; }, REDIRECT_MS);
  }

  /* Запуск */

  var nick = cleanNick(params.get('ig') || '');
  if (nick) $('ig').value = nick;
  var name = (params.get('name') || '').slice(0, 60);
  if (name) $('name').value = name;

  fillDiff();
  $('form').addEventListener('submit', submit);
  $('back').addEventListener('click', function () { showOnly('pick'); });
  loadSlots();
})();
