export const load = async (event: any) => {
  const cookies = event.cookies;
  const sbUser = cookies.get('sb_user');
  let user = null;
  if (sbUser) {
    try {
      user = JSON.parse(sbUser);
    } catch (e) {
      user = null;
    }
  }
  return { user };
};
