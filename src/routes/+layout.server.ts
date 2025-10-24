export const load = async (event: any) => {
  const cookies = event.cookies;
  console.log('Layout load - cookies token:', cookies.get('sb_access_token'));
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
