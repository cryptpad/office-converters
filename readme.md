# Office Converters

This repository is an example of a browser-based document converter using Web Assembly. Developed by the [CryptPad](https://cryptpad.org) team for INTEROFFICE, a project funded by [NGI DAPSI](https://dapsi.ngi.eu) under [EU grant agreement no 781498](https://cordis.europa.eu/project/id/871498).

## License

This software is available under the terms of the [Affero GNU Public License version 3.0 or later](LICENSE).

## Usage

_We assume you have a recent version of NodeJS, which can be installed and managed using [NVM](https://github.com/nvm-sh/nvm#installing-and-updating)_.

Fetch the latest version of the code from GitHub:

```bash
git clone https://github.com/xwiki-labs/office-converters
```

Change into the project directory and install its dependencies

```bash
cd office-converters
npm install
```

Then launch the server:

```bash
node server.js
```

## Production usage

We provide [an example NGINX configuration file](example_nginx_host.conf) which can be adapted for your usage.

