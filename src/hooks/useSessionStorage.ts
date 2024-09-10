const useSessionStorage = () => {
  const isBrowser = typeof window !== 'undefined';

  const setItem = (key, value = '') => {
    if (isBrowser) {
      return sessionStorage.setItem(key, value);
    }
  };

  const getItem = (key) => {
    if (isBrowser) {
      return sessionStorage.getItem(key);
    }
  };

  return {
    setItem,
    getItem,
  };
};

export default useSessionStorage;
