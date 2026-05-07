import { themes as prismThemes } from 'prism-react-renderer';

const simplePlantUML = require("@akebifiky/remark-simple-plantuml");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'API Contract Hub',
  tagline: 'Техническая документация',
  favicon: 'img/favicon.ico',
  url: 'https://Gudllleifr.github.io',
  baseUrl: '/test/',
  organizationName: 'Gudllleifr',
  projectName: 'test',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  trailingSlash: false,
  deploymentBranch: 'gh-pages',

  plugins: [
    ['drawio', {}],
    // Второй docs instance для Style Guide
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'style-guide',
        path: 'style-guide',
        routeBasePath: 'style-guide',
        sidebarPath: require.resolve('./sidebars-style-guide.js'),
        remarkPlugins: [simplePlantUML],
      },
    ],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: 'docs',
          editUrl:
              'https://github.com/Gudllleifr/test/edit/main/my-website/',
          remarkPlugins: [simplePlantUML],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
    [
      'redocusaurus',
      {
        specs: [
          {
            id: 'contract-hub',
            spec: 'api_specs/contract-hub.yaml',
              },
        ],
        theme: {
          primaryColor: '#1890ff',
        },
      }
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: '',
        logo: {
          alt: 'HeroTask Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Документация',
          },
          {
            to: '/style-guide/',
            label: 'Style Guide',
            position: 'left',
          },
          {
            href: 'https://github.com/Gudllleifr/test',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Документация',
            items: [
              {
                label: 'Карточка сервиса',
                to: '/docs/intro',
              },
              {
                label: 'Архитектура',
                to: '/docs/arch',
              },
            ],
          },
          {
            title: 'Для авторов',
            items: [
              {
                label: 'Style Guide',
                to: '/style-guide/',
              },
              {
                label: 'Репозиторий',
                href: 'https://github.com/Gudllleifr/test',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} API Contract Hub. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
