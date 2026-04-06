export function Footer() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} TokenGen. Built on Sepolia Testnet.</p>
    </footer>
  );
}
