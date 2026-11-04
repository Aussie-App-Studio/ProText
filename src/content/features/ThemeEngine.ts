import { useEffect, useState, useSyncExternalStore } from 'react';
import { getSetting, setSetting } from '../db';

export type ThemeMode = 'dark' | 'light';
export type ThemeCategory = 'auto' | 'dark' | 'light';

export interface CustomTheme {
  id: string;
  name: string;
  bodyBg: string;
  sidebarBg: string;
  outgoingBg: string;
  outgoingText: string;
  incomingBg: string;
  incomingText: string;
  textColor: string;
  mode?: ThemeMode;
}

export interface BuiltinTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  dotColor: string;
  css: string;
}

export function isDarkColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return true;
}

export function toTransparentRgba(color: string): string {
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, 0)`;
    }
  }
  const clean = color.replace('#', '').trim();
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, 0)`;
}

export interface ThemeCssConfig {
  bodyBg: string;
  sidebarBg?: string;
  headerBg?: string;
  headerBorder?: string;
  sidebarBorder?: string;
  selectedBg: string;
  hoverBg?: string;
  textColor: string;
  snippetColor?: string;
  outgoingBg: string;
  outgoingText: string;
  incomingBg: string;
  incomingText: string;
  inputBoxBg?: string;
  inputBoxBorder?: string;
  inputTextColor?: string;
  placeholderColor?: string;
  pickerFill?: string;
}

export function createThemeCss(cfg: ThemeCssConfig): string {
  const isDark = isDarkColor(cfg.bodyBg);
  const border = cfg.sidebarBorder || (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)');
  const headerBorder = cfg.headerBorder || (isDark ? 'rgb(60, 64, 67)' : 'rgba(0, 0, 0, 0.08)');
  const sidebarBorder = cfg.sidebarBorder || (isDark ? 'rgb(32, 33, 36)' : border);
  const hoverBg = cfg.hoverBg || (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)');
  const snippetColor = cfg.snippetColor || (isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)');
  const sidebarBg = cfg.sidebarBg || cfg.bodyBg;
  const headerBg = cfg.headerBg || cfg.bodyBg;

  const transparentBodyBg = toTransparentRgba(cfg.bodyBg);
  const inputBoxBg = cfg.inputBoxBg || (isDark ? cfg.incomingBg : '#ffffff');
  const inputTextColor = cfg.inputTextColor || (isDark ? (cfg.incomingText || cfg.textColor) : cfg.textColor);
  const inputBoxBorder = cfg.inputBoxBorder !== undefined
    ? cfg.inputBoxBorder
    : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.12)');
  const placeholderColor = cfg.placeholderColor || (isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)');
  const pickerFill = cfg.pickerFill || (isDark ? (cfg.incomingText || cfg.textColor) : 'rgba(0, 0, 0, 0.6)');

  return `
    /* Universal Canvas: Chat Pane, Landing Zero-State, and New Conv Container */
    body, mw-app, mw-bootstrap, mw-g-ui-container, .main-container, mw-main-container,
    mw-conversation-container, [data-e2e-conversation-container],
    mw-main-landing, .main-landing,
    mw-new-conversation-container, mw-new-conversation-container .new-conversation-container, mw-new-conversation,
    mw-contacts-list, .contacts-container {
      background-color: ${cfg.bodyBg} !important;
      color: ${cfg.textColor} !important;
    }

    /* Top Bar: subtle hairline bottom border matching Google stock */
    mw-branded-header {
      background-color: ${headerBg} !important;
      border-bottom: 1px solid ${headerBorder} !important;
      color: ${cfg.textColor} !important;
    }

    /* Entire Left Sidebar: UNIFIED navigation surface across Start Chat, Folders, and Conversations List */
    mw-main-nav, .main-nav, .main-nav-header, mws-conversations-list {
      background-color: ${sidebarBg} !important;
      color: ${cfg.textColor} !important;
    }
    mw-main-nav {
      border-right: 1px solid ${sidebarBorder} !important;
    }

    /* Conversation Header: Solid surface so scrolled messages never bleed through */
    mws-header, mw-conversation-header, mw-conversation-container .header {
      background-color: ${headerBg} !important;
      border-bottom: none !important;
      color: ${cfg.textColor} !important;
    }

    /* Start chat / New conversation subheader ("To:" recipient row) */
    mw-new-conversation-sub-header, mw-new-conversation-sub-header .sub-header, .new-conversation-sub-header,
    mw-new-conversation-container mws-header, mw-new-conversation-container .header {
      background-color: ${cfg.bodyBg} !important;
      border-bottom: 1px solid ${headerBorder} !important;
      color: ${cfg.textColor} !important;
    }

    /* Search Bar in topbar: Google's rounded pill */
    mw-branded-header .search-container, mw-branded-header mws-search-bar {
      background-color: ${cfg.incomingBg} !important;
      color: ${cfg.textColor} !important;
    }
    /* Hamburger menu flyout drawer theming */
    mw-nav-drawer, mw-nav-drawer nav.container, mw-nav-drawer .container {
      background-color: ${cfg.sidebarBg} !important;
      color: ${cfg.textColor} !important;
      border-right: 1px solid ${border} !important;
    }
    mw-nav-drawer .logo-link, mw-nav-drawer .logo {
      color: ${cfg.textColor} !important;
    }
    mw-nav-drawer .nav-drawer-label, mw-nav-drawer .nav-item {
      color: ${cfg.textColor} !important;
    }
    mw-nav-drawer mw-nav-drawer-item:not(.mp-nav-drawer-item) mws-icon,
    mw-nav-drawer mw-nav-drawer-item:not(.mp-nav-drawer-item) mws-icon svg {
      color: ${snippetColor} !important;
      fill: ${snippetColor} !important;
    }
    mw-nav-drawer hr.section-separator, mw-nav-drawer hr {
      border-color: ${border} !important;
    }
    mw-nav-drawer .nav-item:hover, mw-nav-drawer .nav-item:focus, mw-nav-drawer .nav-item:focus-within {
      background-color: ${hoverBg} !important;
    }
    mws-conversation-list-item a.selected {
      background-color: ${cfg.selectedBg} !important;
    }
    mws-conversation-list-item:hover a {
      background-color: ${hoverBg} !important;
    }
    [data-e2e-conversation-name], [data-e2e-header-title] {
      color: ${cfg.textColor} !important;
    }
    [data-e2e-conversation-snippet] {
      color: ${snippetColor} !important;
    }
    [data-e2e-message-outgoing="true"] mws-message-part-content {
      background-color: ${cfg.outgoingBg} !important;
      color: ${cfg.outgoingText} !important;
    }
    [data-e2e-message-outgoing="false"] mws-message-part-content {
      background-color: ${cfg.incomingBg} !important;
      color: ${cfg.incomingText} !important;
    }
    mws-message-compose {
      --input-bg-color: ${inputBoxBg} !important;
      --input-color: ${inputTextColor} !important;
      --input-bg-fade-color: ${cfg.bodyBg} !important;
      --input-bg-transparent-fade-color: ${transparentBodyBg} !important;
      --picker-button-fill-color: ${pickerFill} !important;
      --picker-button-selected-fill-color: ${inputTextColor} !important;
      color: ${inputTextColor} !important;
    }
    mws-message-compose .input-background {
      background: linear-gradient(to bottom, ${transparentBodyBg} 0%, ${cfg.bodyBg} 45%) !important;
    }
    mws-message-compose .input-box {
      background-color: ${inputBoxBg} !important;
      color: ${inputTextColor} !important;
      ${inputBoxBorder ? `border: 1px solid ${inputBoxBorder} !important;` : ''}
    }
    mws-message-compose .floating-button {
      background-color: ${inputBoxBg} !important;
      color: ${inputTextColor} !important;
    }
    mws-message-compose [contenteditable], mws-message-compose textarea, mws-message-compose .input {
      background-color: transparent !important;
      color: ${inputTextColor} !important;
    }
    mws-message-compose [placeholder].is-empty::before, mws-message-compose textarea::placeholder {
      color: ${placeholderColor} !important;
    }
    mws-message-compose .picker-button mws-icon, mws-message-compose .picker-icon {
      color: ${pickerFill} !important;
      fill: ${pickerFill} !important;
    }
    mws-message-compose .reply-header-container {
      background-color: ${inputBoxBg} !important;
      color: ${inputTextColor} !important;
    }

    /* Empty / Landing view (No conversation selected) */
    mw-main-landing, .main-landing, mw-main-container, .main-container {
      background-color: ${cfg.bodyBg} !important;
      color: ${cfg.textColor} !important;
    }
    mw-main-landing .title, .main-landing .title {
      color: ${cfg.textColor} !important;
    }
    mw-main-landing .sub-title, .main-landing .sub-title {
      color: ${snippetColor} !important;
    }
    mw-main-landing .landing-img, .main-landing .landing-img {
      opacity: ${isDark ? '0.75' : '1'} !important;
    }

    /* Start chat / New conversation container */
    mw-new-conversation-container, mw-new-conversation-container .new-conversation-container, mw-new-conversation {
      background-color: ${cfg.bodyBg} !important;
      color: ${cfg.textColor} !important;
    }
    mw-new-conversation-container mws-header, mw-new-conversation-container .header {
      background-color: ${headerBg} !important;
      color: ${cfg.textColor} !important;
    }
    mw-new-conversation-container .title-text, mw-new-conversation-container h2 {
      color: ${cfg.textColor} !important;
    }
    mw-new-conversation-container [data-e2e-header-back-button], mw-new-conversation-container button[mat-icon-button] {
      color: ${cfg.textColor} !important;
    }

    /* Start chat recipient topbar & subheader */
    mw-new-conversation-sub-header, mw-new-conversation-sub-header .sub-header, .new-conversation-sub-header {
      background-color: ${headerBg} !important;
      border-bottom: 1px solid ${border} !important;
      color: ${cfg.textColor} !important;
    }
    mw-new-conversation-sub-header .label, .contact-chip-input .label {
      color: ${snippetColor} !important;
    }
    mw-contact-chips-input, mw-contact-chips-input .input-container, mw-contact-chips-input .input-list {
      background-color: transparent !important;
      color: ${cfg.textColor} !important;
    }
    mw-contact-chips-input input, mw-contact-chips-input input.input, [data-e2e-contact-input] {
      background-color: transparent !important;
      color: ${cfg.textColor} !important;
    }
    mw-contact-chips-input input::placeholder, [data-e2e-contact-input]::placeholder {
      color: ${placeholderColor} !important;
    }

    /* Recipient Chips (Those present in chat) */
    mat-chip-listbox, .mat-mdc-chip-listbox, .mdc-evolution-chip-set {
      background-color: transparent !important;
    }
    mat-chip-option, mat-chip-row, mat-chip, .mat-mdc-chip, .contact-chip, .mdc-evolution-chip {
      background-color: ${cfg.incomingBg} !important;
      color: ${cfg.incomingText || cfg.textColor} !important;
      border: 1px solid ${border} !important;
    }
    .mdc-evolution-chip__cell, .mdc-evolution-chip__action, .mat-mdc-chip-action,
    .mat-mdc-chip-action-label, .mdc-evolution-chip__text-label,
    .mdc-evolution-chip__text-label span, .contact-chip .name {
      color: ${cfg.incomingText || cfg.textColor} !important;
    }
    .mdc-evolution-chip__checkmark-svg, .mdc-evolution-chip__checkmark-path,
    .mat-mdc-chip-remove svg, .mat-mdc-chip-remove, .mat-mdc-chip-graphic, .mdc-evolution-chip__icon {
      stroke: ${cfg.incomingText || cfg.textColor} !important;
      color: ${cfg.incomingText || cfg.textColor} !important;
      fill: ${cfg.incomingText || cfg.textColor} !important;
    }

    /* Contacts picker & contacts list in Start chat */
    mw-contacts-list, .contacts-container {
      background-color: ${cfg.bodyBg} !important;
      color: ${cfg.textColor} !important;
    }
    mw-contacts-list .label, mw-contacts-list .top-contacts-group-label, mw-contacts-list .group-label {
      color: ${snippetColor} !important;
    }
    mw-contact-row {
      background-color: transparent !important;
      color: ${cfg.textColor} !important;
    }
    mw-contact-row:hover, mw-contact-row.hover, mw-contact-row:focus-within, mw-contact-row .contact.hover {
      background-color: ${hoverBg} !important;
    }
    mw-contact-row .name, mw-contact-row [data-e2e-contact-name], mw-contact-row .contact-name, mw-contact-row span {
      color: ${cfg.textColor} !important;
    }
    mw-contact-row .info-number, mw-contact-row .details, mw-contact-row .phone-number, mw-contact-row .mid-dot {
      color: ${snippetColor} !important;
    }
    mw-new-conversation-start-group-button button, .start-group-button, [data-e2e-start-group-chat-button] {
      color: ${cfg.outgoingBg} !important;
    }
    mw-contact-chips-input .next-button, button[data-e2e-next-button] {
      background-color: ${cfg.outgoingBg} !important;
      color: ${cfg.outgoingText} !important;
    }
    button.load-more, mw-contacts-list .load-more {
      background-color: ${cfg.incomingBg} !important;
      color: ${cfg.textColor} !important;
      border: 1px solid ${border} !important;
    }
    mw-skeleton-loader .skeleton-avatar, mw-skeleton-loader .skeleton-line {
      background-color: ${hoverBg} !important;
    }
  `;
}

export const BUILTIN_THEMES: BuiltinTheme[] = [
  {
    id: 'default',
    name: 'Google Default (Auto)',
    category: 'auto',
    dotColor: '#3b82f6',
    css: ''
  },
  // Dedicated Dark Themes
  {
    id: 'default_dark',
    name: 'Default Dark',
    category: 'dark',
    dotColor: '#202124',
    css: createThemeCss({
      bodyBg: '#202124',
      sidebarBg: '#2a2b2e',
      headerBg: '#202124',
      headerBorder: 'rgb(60, 64, 67)',
      sidebarBorder: 'rgb(32, 33, 36)',
      selectedBg: 'rgba(248, 249, 250, 0.06)',
      hoverBg: 'rgba(255, 255, 255, 0.04)',
      textColor: '#e8eaed',
      snippetColor: '#9aa0a6',
      outgoingBg: '#1a73e8',
      outgoingText: '#ffffff',
      incomingBg: '#303134',
      incomingText: '#e8eaed',
      inputBoxBg: '#303134',
      inputBoxBorder: 'transparent',
      placeholderColor: '#9aa0a6',
      pickerFill: '#9aa0a6'
    })
  },
  {
    id: 'dracula',
    name: 'Dracula',
    category: 'dark',
    dotColor: '#bd93f9',
    css: createThemeCss({
      bodyBg: '#282a36',
      sidebarBg: '#21222c',
      selectedBg: '#44475a',
      hoverBg: '#383a48',
      textColor: '#f8f8f2',
      snippetColor: '#6272a4',
      outgoingBg: '#bd93f9',
      outgoingText: '#282a36',
      incomingBg: '#44475a',
      incomingText: '#f8f8f2',
      inputBoxBg: '#44475a',
      inputBoxBorder: 'rgba(255, 255, 255, 0.08)',
      placeholderColor: '#6272a4',
      pickerFill: '#bd93f9'
    })
  },
  {
    id: 'navy',
    name: 'Navy Midnight',
    category: 'dark',
    dotColor: '#3a86ff',
    css: createThemeCss({
      bodyBg: '#0b132b',
      sidebarBg: '#1c2541',
      selectedBg: '#243356',
      hoverBg: '#1e2a47',
      textColor: '#e0e1dd',
      snippetColor: '#8da9c4',
      outgoingBg: '#3a86ff',
      outgoingText: '#ffffff',
      incomingBg: '#243356',
      incomingText: '#e0e1dd',
      inputBoxBg: '#243356',
      inputBoxBorder: 'rgba(255, 255, 255, 0.08)',
      placeholderColor: '#8da9c4',
      pickerFill: '#8da9c4'
    })
  },
  {
    id: 'forest',
    name: 'Emerald Forest',
    category: 'dark',
    dotColor: '#10b981',
    css: createThemeCss({
      bodyBg: '#0f201b',
      sidebarBg: '#0b1713',
      selectedBg: '#1a3830',
      hoverBg: '#142d27',
      textColor: '#d1fae5',
      snippetColor: '#6ee7b7',
      outgoingBg: '#10b981',
      outgoingText: '#042f2e',
      incomingBg: '#1a3830',
      incomingText: '#d1fae5',
      inputBoxBg: '#1a3830',
      inputBoxBorder: 'rgba(255, 255, 255, 0.08)',
      placeholderColor: '#6ee7b7',
      pickerFill: '#6ee7b7'
    })
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'dark',
    dotColor: '#00f0ff',
    css: createThemeCss({
      bodyBg: '#0d0221',
      sidebarBg: '#05050f',
      sidebarBorder: 'rgba(255, 255, 255, 0.1)',
      selectedBg: '#250942',
      hoverBg: '#1d0733',
      textColor: '#00f0ff',
      snippetColor: '#a78bfa',
      outgoingBg: '#ff007f',
      outgoingText: '#ffffff',
      incomingBg: '#241442',
      incomingText: '#00f0ff',
      inputBoxBg: '#241442',
      inputBoxBorder: 'rgba(0, 240, 255, 0.3)',
      placeholderColor: '#a78bfa',
      pickerFill: '#00f0ff'
    })
  },
  {
    id: 'pink',
    name: 'Pink Sakura',
    category: 'dark',
    dotColor: '#ec4899',
    css: createThemeCss({
      bodyBg: '#2a1b24',
      sidebarBg: '#381f2f',
      selectedBg: '#542d47',
      hoverBg: '#442439',
      textColor: '#fce7f3',
      snippetColor: '#f472b6',
      outgoingBg: '#ec4899',
      outgoingText: '#ffffff',
      incomingBg: '#542d47',
      incomingText: '#fce7f3',
      inputBoxBg: '#542d47',
      inputBoxBorder: 'rgba(255, 255, 255, 0.08)',
      placeholderColor: '#f472b6',
      pickerFill: '#ec4899'
    })
  },
  {
    id: 'amoled',
    name: 'AMOLED Pure Black',
    category: 'dark',
    dotColor: '#000000',
    css: createThemeCss({
      bodyBg: '#000000',
      sidebarBg: '#0a0a0a',
      sidebarBorder: '#262626',
      selectedBg: '#1f1f23',
      hoverBg: '#141416',
      textColor: '#ffffff',
      snippetColor: '#a1a1aa',
      outgoingBg: '#2563eb',
      outgoingText: '#ffffff',
      incomingBg: '#18181b',
      incomingText: '#ffffff',
      inputBoxBg: '#18181b',
      inputBoxBorder: '#262626',
      placeholderColor: '#a1a1aa',
      pickerFill: '#a1a1aa'
    })
  },

  // Dedicated Light Themes
  {
    id: 'light',
    name: 'Clean Light',
    category: 'light',
    dotColor: '#f8fafc',
    css: createThemeCss({
      bodyBg: '#f8fafc',
      sidebarBg: '#ffffff',
      sidebarBorder: '#e2e8f0',
      selectedBg: '#e2e8f0',
      hoverBg: '#f1f5f9',
      textColor: '#0f172a',
      snippetColor: '#64748b',
      outgoingBg: '#2563eb',
      outgoingText: '#ffffff',
      incomingBg: '#e2e8f0',
      incomingText: '#0f172a',
      inputBoxBg: '#ffffff',
      inputBoxBorder: '#e2e8f0',
      placeholderColor: '#64748b',
      pickerFill: '#64748b'
    })
  },
  {
    id: 'nordic',
    name: 'Nordic Frost',
    category: 'light',
    dotColor: '#0284c7',
    css: createThemeCss({
      bodyBg: '#f0f9ff',
      sidebarBg: '#ffffff',
      sidebarBorder: '#bae6fd',
      selectedBg: '#e0f2fe',
      hoverBg: '#f0f9ff',
      textColor: '#0c4a6e',
      snippetColor: '#0369a1',
      outgoingBg: '#0284c7',
      outgoingText: '#ffffff',
      incomingBg: '#e0f2fe',
      incomingText: '#0c4a6e',
      inputBoxBg: '#ffffff',
      inputBoxBorder: '#bae6fd',
      placeholderColor: '#0369a1',
      pickerFill: '#0284c7'
    })
  },
  {
    id: 'warm_sand',
    name: 'Warm Paper',
    category: 'light',
    dotColor: '#d97706',
    css: createThemeCss({
      bodyBg: '#fdfbf7',
      sidebarBg: '#fbf7ee',
      sidebarBorder: '#f2e8d3',
      selectedBg: '#faeed9',
      hoverBg: '#fbf3e5',
      textColor: '#451a03',
      snippetColor: '#92400e',
      outgoingBg: '#d97706',
      outgoingText: '#ffffff',
      incomingBg: '#fef3c7',
      incomingText: '#78350f',
      inputBoxBg: '#ffffff',
      inputBoxBorder: '#f2e8d3',
      placeholderColor: '#92400e',
      pickerFill: '#d97706'
    })
  },
  {
    id: 'lavender',
    name: 'Lavender Mist',
    category: 'light',
    dotColor: '#9333ea',
    css: createThemeCss({
      bodyBg: '#faf5ff',
      sidebarBg: '#ffffff',
      sidebarBorder: '#e9d5ff',
      selectedBg: '#f3e8ff',
      hoverBg: '#faf5ff',
      textColor: '#3b0764',
      snippetColor: '#7e22ce',
      outgoingBg: '#9333ea',
      outgoingText: '#ffffff',
      incomingBg: '#f3e8ff',
      incomingText: '#581c87',
      inputBoxBg: '#ffffff',
      inputBoxBorder: '#e9d5ff',
      placeholderColor: '#7e22ce',
      pickerFill: '#9333ea'
    })
  },
  {
    id: 'mint',
    name: 'Mint Breeze',
    category: 'light',
    dotColor: '#059669',
    css: createThemeCss({
      bodyBg: '#f0fdf4',
      sidebarBg: '#ffffff',
      sidebarBorder: '#bbf7d0',
      selectedBg: '#dcfce7',
      hoverBg: '#f0fdf4',
      textColor: '#064e3b',
      snippetColor: '#047857',
      outgoingBg: '#059669',
      outgoingText: '#ffffff',
      incomingBg: '#d1fae5',
      incomingText: '#065f46',
      inputBoxBg: '#ffffff',
      inputBoxBorder: '#bbf7d0',
      placeholderColor: '#047857',
      pickerFill: '#059669'
    })
  }
];

export function generateCustomThemeCss(t: CustomTheme): string {
  const isDark = isDarkColor(t.bodyBg);
  return createThemeCss({
    bodyBg: t.bodyBg,
    sidebarBg: t.sidebarBg,
    selectedBg: t.incomingBg,
    textColor: t.textColor,
    outgoingBg: t.outgoingBg,
    outgoingText: t.outgoingText,
    incomingBg: t.incomingBg,
    incomingText: t.incomingText,
    inputBoxBg: isDark ? t.incomingBg : '#ffffff',
    inputTextColor: isDark ? (t.incomingText || t.textColor) : t.textColor,
    inputBoxBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'
  });
}

export function isGoogleNativeDark(): boolean {
  const darkPref = localStorage.getItem('dark_mode_enabled');
  if (darkPref === 'true') return true;
  if (darkPref === 'false' || darkPref === '0') return false;
  // If not explicitly set in localStorage, check document.body or prefers-color-scheme
  if (typeof document !== 'undefined' && document.body?.classList.contains('dark-theme')) {
    return true;
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

export interface ThemePalette {
  themeId: string;
  isLight: boolean;
  boxBg: string;
  boxBorder: string;
  textColor: string;
  mutedTextColor: string;
  dividerBorder: string;
  avatarBg: string;
  avatarText: string;
  outgoingBg: string;
  outgoingText: string;
  incomingBg: string;
  incomingText: string;
  snippetBg: string;
  snippetBorder?: string;
  boxShadow: string;
}

export function getThemePalette(
  themeId: string,
  customList: CustomTheme[],
  effectiveMode: ThemeMode
): ThemePalette {
  const isLight = effectiveMode === 'light';

  // 1. Check custom themes
  const custom = customList.find(c => c.id === themeId);
  if (custom) {
    const isDark = isDarkColor(custom.bodyBg);
    return {
      themeId,
      isLight: !isDark,
      boxBg: custom.sidebarBg || custom.bodyBg,
      boxBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      textColor: custom.textColor,
      mutedTextColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
      dividerBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      avatarBg: custom.outgoingBg,
      avatarText: custom.outgoingText,
      outgoingBg: custom.outgoingBg,
      outgoingText: custom.outgoingText,
      incomingBg: custom.incomingBg,
      incomingText: custom.incomingText,
      snippetBg: custom.incomingBg,
      snippetBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      boxShadow: isDark ? '0 12px 28px rgba(0, 0, 0, 0.5)' : '0 12px 28px rgba(0, 0, 0, 0.15)'
    };
  }

  // 2. Specific built-in themes
  switch (themeId) {
    case 'default_dark':
      return {
        themeId,
        isLight: false,
        boxBg: '#2a2b2e',
        boxBorder: 'rgb(60, 64, 67)',
        textColor: '#e8eaed',
        mutedTextColor: '#9aa0a6',
        dividerBorder: '#3c4043',
        avatarBg: '#1a73e8',
        avatarText: '#ffffff',
        outgoingBg: '#1a73e8',
        outgoingText: '#ffffff',
        incomingBg: '#303134',
        incomingText: '#e8eaed',
        snippetBg: '#2a2b2e',
        snippetBorder: 'rgb(60, 64, 67)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)'
      };

    case 'dracula':
      return {
        themeId,
        isLight: false,
        boxBg: '#21222c',
        boxBorder: 'rgba(255, 255, 255, 0.12)',
        textColor: '#f8f8f2',
        mutedTextColor: '#6272a4',
        dividerBorder: 'rgba(255, 255, 255, 0.08)',
        avatarBg: '#bd93f9',
        avatarText: '#282a36',
        outgoingBg: '#bd93f9',
        outgoingText: '#282a36',
        incomingBg: '#44475a',
        incomingText: '#f8f8f2',
        snippetBg: '#282a36',
        snippetBorder: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)'
      };

    case 'navy':
      return {
        themeId,
        isLight: false,
        boxBg: '#1c2541',
        boxBorder: 'rgba(255, 255, 255, 0.12)',
        textColor: '#e0e1dd',
        mutedTextColor: '#8da9c4',
        dividerBorder: 'rgba(255, 255, 255, 0.08)',
        avatarBg: '#3a86ff',
        avatarText: '#ffffff',
        outgoingBg: '#3a86ff',
        outgoingText: '#ffffff',
        incomingBg: '#243356',
        incomingText: '#e0e1dd',
        snippetBg: '#0b132b',
        snippetBorder: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)'
      };

    case 'forest':
      return {
        themeId,
        isLight: false,
        boxBg: '#0b1713',
        boxBorder: 'rgba(255, 255, 255, 0.12)',
        textColor: '#d1fae5',
        mutedTextColor: '#6ee7b7',
        dividerBorder: 'rgba(255, 255, 255, 0.08)',
        avatarBg: '#10b981',
        avatarText: '#042f2e',
        outgoingBg: '#10b981',
        outgoingText: '#042f2e',
        incomingBg: '#1a3830',
        incomingText: '#d1fae5',
        snippetBg: '#0f201b',
        snippetBorder: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)'
      };

    case 'cyberpunk':
      return {
        themeId,
        isLight: false,
        boxBg: '#05050f',
        boxBorder: 'rgba(0, 240, 255, 0.3)',
        textColor: '#00f0ff',
        mutedTextColor: '#a78bfa',
        dividerBorder: 'rgba(0, 240, 255, 0.15)',
        avatarBg: '#ff007f',
        avatarText: '#ffffff',
        outgoingBg: '#ff007f',
        outgoingText: '#ffffff',
        incomingBg: '#241442',
        incomingText: '#00f0ff',
        snippetBg: '#0d0221',
        snippetBorder: 'rgba(0, 240, 255, 0.2)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7)'
      };

    case 'pink':
      return {
        themeId,
        isLight: false,
        boxBg: '#381f2f',
        boxBorder: 'rgba(255, 255, 255, 0.12)',
        textColor: '#fce7f3',
        mutedTextColor: '#f472b6',
        dividerBorder: 'rgba(255, 255, 255, 0.08)',
        avatarBg: '#ec4899',
        avatarText: '#ffffff',
        outgoingBg: '#ec4899',
        outgoingText: '#ffffff',
        incomingBg: '#542d47',
        incomingText: '#fce7f3',
        snippetBg: '#2a1b24',
        snippetBorder: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)'
      };

    case 'amoled':
      return {
        themeId,
        isLight: false,
        boxBg: '#0a0a0a',
        boxBorder: '#262626',
        textColor: '#ffffff',
        mutedTextColor: '#a1a1aa',
        dividerBorder: '#262626',
        avatarBg: '#2563eb',
        avatarText: '#ffffff',
        outgoingBg: '#2563eb',
        outgoingText: '#ffffff',
        incomingBg: '#18181b',
        incomingText: '#ffffff',
        snippetBg: '#141416',
        snippetBorder: '#262626',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.8)'
      };

    case 'light':
      return {
        themeId,
        isLight: true,
        boxBg: '#ffffff',
        boxBorder: '#e2e8f0',
        textColor: '#0f172a',
        mutedTextColor: '#64748b',
        dividerBorder: '#e2e8f0',
        avatarBg: '#2563eb',
        avatarText: '#ffffff',
        outgoingBg: '#2563eb',
        outgoingText: '#ffffff',
        incomingBg: '#e2e8f0',
        incomingText: '#0f172a',
        snippetBg: '#f1f5f9',
        snippetBorder: '#e2e8f0',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.1)'
      };

    case 'nordic':
      return {
        themeId,
        isLight: true,
        boxBg: '#ffffff',
        boxBorder: '#bae6fd',
        textColor: '#0c4a6e',
        mutedTextColor: '#0369a1',
        dividerBorder: '#e0f2fe',
        avatarBg: '#0284c7',
        avatarText: '#ffffff',
        outgoingBg: '#0284c7',
        outgoingText: '#ffffff',
        incomingBg: '#e0f2fe',
        incomingText: '#0c4a6e',
        snippetBg: '#f0f9ff',
        snippetBorder: '#bae6fd',
        boxShadow: '0 12px 28px rgba(2, 132, 199, 0.12)'
      };

    case 'warm_sand':
      return {
        themeId,
        isLight: true,
        boxBg: '#fbf7ee',
        boxBorder: '#f2e8d3',
        textColor: '#451a03',
        mutedTextColor: '#92400e',
        dividerBorder: '#faeed9',
        avatarBg: '#d97706',
        avatarText: '#ffffff',
        outgoingBg: '#d97706',
        outgoingText: '#ffffff',
        incomingBg: '#fef3c7',
        incomingText: '#78350f',
        snippetBg: '#fdfbf7',
        snippetBorder: '#f2e8d3',
        boxShadow: '0 12px 28px rgba(69, 26, 3, 0.1)'
      };

    case 'lavender':
      return {
        themeId,
        isLight: true,
        boxBg: '#ffffff',
        boxBorder: '#e9d5ff',
        textColor: '#3b0764',
        mutedTextColor: '#7e22ce',
        dividerBorder: '#f3e8ff',
        avatarBg: '#9333ea',
        avatarText: '#ffffff',
        outgoingBg: '#9333ea',
        outgoingText: '#ffffff',
        incomingBg: '#f3e8ff',
        incomingText: '#581c87',
        snippetBg: '#faf5ff',
        snippetBorder: '#e9d5ff',
        boxShadow: '0 12px 28px rgba(147, 51, 234, 0.12)'
      };

    case 'mint':
      return {
        themeId,
        isLight: true,
        boxBg: '#ffffff',
        boxBorder: '#bbf7d0',
        textColor: '#064e3b',
        mutedTextColor: '#047857',
        dividerBorder: '#dcfce7',
        avatarBg: '#059669',
        avatarText: '#ffffff',
        outgoingBg: '#059669',
        outgoingText: '#ffffff',
        incomingBg: '#d1fae5',
        incomingText: '#065f46',
        snippetBg: '#f0fdf4',
        snippetBorder: '#bbf7d0',
        boxShadow: '0 12px 28px rgba(5, 150, 105, 0.12)'
      };

    default:
      // 'default' (Google Default Auto Sync)
      if (isLight) {
        return {
          themeId: 'default',
          isLight: true,
          boxBg: '#ffffff',
          boxBorder: '#dadce0',
          textColor: '#1f1f1f',
          mutedTextColor: '#5f6368',
          dividerBorder: '#f1f3f4',
          avatarBg: '#0b57d0',
          avatarText: '#ffffff',
          outgoingBg: '#0b57d0',
          outgoingText: '#ffffff',
          incomingBg: '#f2f2f2',
          incomingText: '#1f1f1f',
          snippetBg: '#f8f9fa',
          snippetBorder: '#dadce0',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)'
        };
      } else {
        return {
          themeId: 'default',
          isLight: false,
          boxBg: '#1e1f20',
          boxBorder: '#444746',
          textColor: '#e3e3e3',
          mutedTextColor: '#9aa0a6',
          dividerBorder: '#303134',
          avatarBg: '#0b57d0',
          avatarText: '#ffffff',
          outgoingBg: '#0b57d0',
          outgoingText: '#ffffff',
          incomingBg: '#303134',
          incomingText: '#e3e3e3',
          snippetBg: '#282a2d',
          snippetBorder: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)'
        };
      }
  }
}

export function getEffectiveMode(themeId: string, customList: CustomTheme[]): ThemeMode {
  const builtin = BUILTIN_THEMES.find(t => t.id === themeId);
  if (builtin) {
    if (builtin.category === 'auto') {
      return isGoogleNativeDark() ? 'dark' : 'light';
    }
    return builtin.category;
  }
  const custom = customList.find(c => c.id === themeId);
  if (custom) {
    return isDarkColor(custom.bodyBg) ? 'dark' : 'light';
  }
  return isGoogleNativeDark() ? 'dark' : 'light';
}

const THEME_KEY = 'selectedTheme';
const CUSTOM_THEMES_KEY = 'customThemes';
const STYLE_ID = 'mp-theme-override-css';

let currentThemeId: string = 'default';
let customThemesList: CustomTheme[] = [];
let effectiveMode: ThemeMode = 'dark';
let loaded = false;
let isInternalClassMutation = false;

let snapshot: {
  currentTheme: string;
  customThemes: CustomTheme[];
  effectiveMode: ThemeMode;
  loaded: boolean;
} = {
  currentTheme: currentThemeId,
  customThemes: customThemesList,
  effectiveMode,
  loaded
};
const listeners = new Set<() => void>();

function notify() {
  snapshot = {
    currentTheme: currentThemeId,
    customThemes: customThemesList,
    effectiveMode,
    loaded
  };
  listeners.forEach(l => l());
}

/** Applies classes to body and injects/removes theme CSS */
export function applyThemeById(id: string, customList: CustomTheme[]) {
  if (typeof document === 'undefined') return;

  const mode = getEffectiveMode(id, customList);
  effectiveMode = mode;

  // 1. Sync classes on body
  isInternalClassMutation = true;
  try {
    if (mode === 'dark') {
      if (!document.body.classList.contains('dark-theme')) {
        document.body.classList.add('dark-theme');
      }
      document.body.classList.add('mp-theme-dark');
      document.body.classList.remove('mp-theme-light');
    } else {
      if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
      }
      document.body.classList.add('mp-theme-light');
      document.body.classList.remove('mp-theme-dark');
    }
  } finally {
    isInternalClassMutation = false;
  }

  // 2. Inject or remove custom CSS style element
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  const builtin = BUILTIN_THEMES.find(t => t.id === id);
  let css = '';

  if (builtin) {
    css = builtin.css;
  } else {
    const custom = customList.find(c => c.id === id);
    if (custom) {
      css = generateCustomThemeCss(custom);
    }
  }

  if (!css) {
    style?.remove();
  } else {
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = css;
  }
}

// Set up MutationObserver to keep classes strictly synchronized
function setupBodyObserver() {
  if (typeof document === 'undefined' || !document.body) return;

  const observer = new MutationObserver(() => {
    if (isInternalClassMutation) return;

    const builtin = BUILTIN_THEMES.find(t => t.id === currentThemeId);
    if (builtin && builtin.category === 'auto') {
      // Auto mode: follow Google's native setting
      const googleIsDark = isGoogleNativeDark();
      const nextMode: ThemeMode = googleIsDark ? 'dark' : 'light';
      if (nextMode !== effectiveMode) {
        effectiveMode = nextMode;
        isInternalClassMutation = true;
        try {
          document.body.classList.toggle('mp-theme-dark', googleIsDark);
          document.body.classList.toggle('mp-theme-light', !googleIsDark);
        } finally {
          isInternalClassMutation = false;
        }
        notify();
      }
    } else {
      // Forced dark or light theme: keep dark-theme enforced
      const requiredMode = getEffectiveMode(currentThemeId, customThemesList);
      if (requiredMode === 'dark' && !document.body.classList.contains('dark-theme')) {
        isInternalClassMutation = true;
        try {
          document.body.classList.add('dark-theme');
        } finally {
          isInternalClassMutation = false;
        }
      } else if (requiredMode === 'light' && document.body.classList.contains('dark-theme')) {
        isInternalClassMutation = true;
        try {
          document.body.classList.remove('dark-theme');
        } finally {
          isInternalClassMutation = false;
        }
      }
    }
  });

  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

// Initial loader
async function init() {
  const [themeId, customs] = await Promise.all([
    getSetting<string>(THEME_KEY, 'default'),
    getSetting<CustomTheme[]>(CUSTOM_THEMES_KEY, [])
  ]);
  currentThemeId = themeId;
  customThemesList = customs;
  loaded = true;

  applyThemeById(currentThemeId, customThemesList);
  setupBodyObserver();
  notify();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void init(), { once: true });
  } else {
    void init();
  }
}

// React live to theme changes made across tabs (e.g. from the Welcome page)
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      let updated = false;
      if (changes[`setting_${THEME_KEY}`]) {
        const next = changes[`setting_${THEME_KEY}`].newValue;
        if (typeof next === 'string' && next !== currentThemeId) {
          currentThemeId = next;
          updated = true;
        }
      }
      if (changes[`setting_${CUSTOM_THEMES_KEY}`]) {
        const nextList = changes[`setting_${CUSTOM_THEMES_KEY}`].newValue;
        if (Array.isArray(nextList)) {
          customThemesList = nextList;
          updated = true;
        }
      }
      if (updated) {
        applyThemeById(currentThemeId, customThemesList);
        notify();
      }
    }
  });
}

const subscribeTheme = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getThemeSnapshot = () => snapshot;

export function useThemeEngine() {
  const state = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot
  );

  const selectTheme = (id: string) => {
    currentThemeId = id;
    applyThemeById(id, customThemesList);
    setSetting(THEME_KEY, id);
    notify();
  };

  const saveCustom = async (theme: CustomTheme) => {
    const existingIndex = customThemesList.findIndex(t => t.id === theme.id);
    let next: CustomTheme[];
    if (existingIndex >= 0) {
      next = [...customThemesList];
      next[existingIndex] = theme;
    } else {
      next = [...customThemesList, theme];
    }
    customThemesList = next;
    currentThemeId = theme.id;
    await setSetting(CUSTOM_THEMES_KEY, next);
    await setSetting(THEME_KEY, theme.id);
    applyThemeById(theme.id, customThemesList);
    notify();
  };

  const deleteCustom = async (id: string) => {
    const next = customThemesList.filter(t => t.id !== id);
    customThemesList = next;
    await setSetting(CUSTOM_THEMES_KEY, next);
    if (currentThemeId === id) {
      currentThemeId = 'default';
      await setSetting(THEME_KEY, 'default');
      applyThemeById('default', next);
    }
    notify();
  };

  return {
    currentTheme: state.currentTheme,
    customThemes: state.customThemes,
    effectiveMode: state.effectiveMode,
    loaded: state.loaded,
    selectTheme,
    saveCustom,
    deleteCustom
  };
}

/** Hook to get active mode: 'dark' | 'light' */
export function useThemeMode(): ThemeMode {
  const { effectiveMode } = useThemeEngine();
  return effectiveMode;
}

/** Hook to get fully resolved palette matching current theme */
export function useThemePalette(): ThemePalette {
  const { currentTheme, customThemes, effectiveMode } = useThemeEngine();
  return getThemePalette(currentTheme, customThemes, effectiveMode);
}
