const useLocalStorage = () => {
  const isBrowser = typeof window !== 'undefined';

  const setItem = (key, value = '') => {
    if (isBrowser) {
      return localStorage.setItem(key, value);
    }
  };

  const getItem = (key) => {
    if (isBrowser) {
      return localStorage.getItem(key);
    }
  };

  const removeItem = (key) => {
    if (isBrowser) {
      return localStorage.removeItem(key);
    }
  };

  const clear = () => {
    if (isBrowser) {
      return localStorage.clear();
    }
  };

  return {
    setItem,
    getItem,
    removeItem,
    clear,
  };
};

export default useLocalStorage;
