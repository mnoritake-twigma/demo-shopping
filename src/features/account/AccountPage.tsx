import { useState, type FormEvent } from "react";
import { Button, InputField } from "@mnoritake-figma/ds";
import { useCart } from "../cart/CartProvider";
export function AccountPage() {
  const { user, login, logout, busy } = useCart();
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await login(String(data.get("email")), String(data.get("password")));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインできませんでした。");
    }
  }
  return (
    <section className="account-page">
      <p className="eyebrow">MY ACCOUNT</p>
      <h1>アカウント</h1>
      {user?.kind === "member" ? (
        <>
          <p>{user.name}さんとしてログインしています。</p>
          <p>カートはアカウントごとに保存されます。</p>
          <Button
            isDisabled={busy}
            onPress={() => {
              setError("");
              void logout().catch(() =>
                setError("ログアウトできませんでした。"),
              );
            }}
          >
            ログアウト
          </Button>
        </>
      ) : (
        <>
          <p>ログインすると、保存したカートを再び開けます。</p>
          <p>ゲストのカートはログイン後のカートとは別に保存されます。</p>
          <form onSubmit={submit}>
            <InputField label="メールアドレス"
                name="email"
                type="email"
                autoComplete="username"
                isRequired
                maxLength={254} />
            <InputField label="パスワード"
                name="password"
                type="password"
                autoComplete="current-password"
                isRequired
                maxLength={128} />
            <Button type="submit" isDisabled={busy}>
              ログイン
            </Button>
          </form>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <a href="#/">お買い物に戻る</a>
    </section>
  );
}
