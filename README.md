# App Gaps

A simple webapp that takes the URL of an iOS app, pulls in the most recent reviews, and uses ChatGPT to summarize the potential product opportunities based on unmet user needs identified in the App Store reviews.

🔑 Requires an OpenAI API key to process reviews and generate themes.

## Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/app-gaps.git
cd app-gaps
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Copy the environment variables:
```bash
cp .env.example .env.local
```

4. Update the environment variables in `.env.local` with your values.

5. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## Project Structure

```
app-gaps/
├── src/              # Source files
├── public/           # Static files
├── docs/            # Documentation
└── ...
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
