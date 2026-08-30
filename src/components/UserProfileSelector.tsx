import React from "react";
import { UserProfile, maskEmail } from "../types";
import { User, RefreshCw, PlusCircle, Sparkles, KeyRound } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface UserProfileSelectorProps {
  users: UserProfile[];
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  onResetBalances: () => Promise<void>;
  onCreateNewUser: (name: string, email: string) => Promise<void>;
}

export const UserProfileSelector: React.FC<UserProfileSelectorProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  onResetBalances,
  onCreateNewUser,
}) => {
  const currentUser = users.find((u) => u.id === selectedUserId);
  const [newUserName, setNewUserName] = React.useState("");
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleAddFunds = async (user: UserProfile) => {
    try {
      const userRef = doc(db, "users", user.id);
      const added = 100;
      const nextAvailable = (user.availableBalance || 0) + added;
      const nextLocked = user.lockedBalance || 0;
      await updateDoc(userRef, {
        availableBalance: nextAvailable,
        balance: nextAvailable,
      });
    } catch (e) {
      console.error("Error adding funds:", e);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    setIsCreating(true);
    try {
      await onCreateNewUser(newUserName, newUserEmail);
      setNewUserName("");
      setNewUserEmail("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div id="user-profile-selector" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-150 font-display flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-500" />
            Simulator Sandbox Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Simulate multiple concurrent traders by switching between active profiles. 
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="toggle-add-user-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/45 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900 rounded-lg active:scale-95 transition-all duration-75 cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {showAddForm ? "Cancel Add User" : "Add Demo User"}
          </button>
          <button
            id="reset-simulation-btn"
            onClick={onResetBalances}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg active:scale-95 transition-all duration-75 cursor-pointer"
            title="Reset all balances"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Balances
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateSubmit} className="mt-4 p-4 border border-indigo-100 dark:border-indigo-950 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Full Name
            </label>
            <input
              id="new-user-name"
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="mt-1 w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Email Address
            </label>
            <input
              id="new-user-email"
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="e.g. ramesh@example.com"
              className="mt-1 w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            id="submit-new-user-btn"
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all duration-75 cursor-pointer disabled:opacity-50"
          >
            Create User
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 mt-4">
        {users.map((user) => {
          const isSelected = user.id === selectedUserId;
          const available = user.availableBalance ?? user.balance;
          const locked = user.lockedBalance ?? 0;
          const total = (user.balance ?? 0);

          return (
            <div
              key={user.id}
              id={`profile-card-${user.id}`}
              onClick={() => onSelectUser(user.id)}
              className={`p-3.5 rounded-xl border active:scale-[0.98] transition-all duration-75 cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30"
                  : "border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="truncate">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {user.name}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate block font-mono">
                    {maskEmail(user.email)}
                  </span>
                </div>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                    isSelected ? "bg-indigo-500 animate-pulse" : "bg-transparent"
                  }`}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1 border-t border-slate-100 dark:border-slate-800/60 pt-2 text-[10px]">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase">Available</span>
                  <span className="font-bold text-slate-800 dark:text-slate-300 font-mono">₹{available.toFixed(0)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-semibold block uppercase">Locked</span>
                  <span className="font-bold text-slate-800 dark:text-slate-300 font-mono">₹{locked.toFixed(0)}</span>
                </div>
              </div>

              <div className="mt-2 bg-slate-100/50 dark:bg-slate-950/40 rounded px-2 py-1 flex justify-between items-center text-[10px]">
                <span className="text-slate-400 uppercase tracking-wide font-semibold">Total</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">₹{total.toFixed(0)}</span>
              </div>

              {/* Add simulated funds button directly to simulator profiles */}
              <button
                id={`add-funds-${user.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddFunds(user);
                }}
                className="absolute top-2 right-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                title="Add ₹100 Available Balance"
              >
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {currentUser && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-5/50 dark:bg-slate-950/20 px-4 py-2.5 rounded-xl">
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            Currently active simulator profile: <strong className="text-slate-900 dark:text-slate-150 font-semibold">{currentUser.name}</strong>
          </span>
          <div className="flex gap-2.5 font-mono text-[11px]">
            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-100/30">
              Available: ₹{(currentUser.availableBalance ?? currentUser.balance ?? 0).toFixed(2)}
            </span>
            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-semibold border border-amber-100/30">
              Locked: ₹{(currentUser.lockedBalance ?? 0).toFixed(2)}
            </span>
            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-extrabold border border-indigo-100/30">
              Total: ₹{(currentUser.balance ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
