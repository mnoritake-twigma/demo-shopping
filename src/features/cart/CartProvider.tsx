import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, remoteAPI, type ShopUser } from "../../api/client";
import type { Cart } from "../../domain/models";
const empty: Cart = {
  items: [],
  subtotal: 0,
  shipping: 0,
  total: 0,
  currency: "JPY",
};
function useCartState() {
  const [cart, setCart] = useState(empty),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [user, setUser] = useState<ShopUser | null>(null);
  const lock = useRef(false);
  async function reload() {
    setError("");
    try {
      if (remoteAPI) setUser((await api.session()).user);
      setCart(await api.cart());
      setReady(true);
    } catch {
      setError("カートを読み込めませんでした。再試行してください。");
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function change(id: string, quantity: number) {
    if (lock.current || !ready) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setCart(
        await (quantity === 0 ? api.remove(id) : api.setQuantity(id, quantity)),
      );
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "カートを更新できませんでした。",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function login(email: string, password: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.login(email, password);
      setCart(empty);
      setReady(false);
      await reload();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.logout();
      setCart(empty);
      setReady(false);
      await reload();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { cart, busy, ready, error, change, reload, user, login, logout };
}
const Context = createContext<ReturnType<typeof useCartState> | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const value = useCartState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error("CartProvider is missing");
  return value;
}
