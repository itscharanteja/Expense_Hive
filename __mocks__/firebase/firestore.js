export const collection = jest.fn();
export const doc = jest.fn();
export const getDoc = jest.fn();
export const setDoc = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const getDocs = jest.fn();

export const getFirestore = jest.fn(() => ({
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
}));
