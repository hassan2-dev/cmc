import { create } from 'zustand';

type UserStoreT = {
  id: number | null;
  name: string | null;
  email: string | null;
  setUser: (user: { id: number; name: string; email: string }) => void;
};

const useUserStore = create<UserStoreT>((set) => ({
  id: null,
  name: null,
  email: null,
  setUser: (user) => set(() => ({ id: user.id, name: user.name, email: user.email })),
}));

export default useUserStore;
