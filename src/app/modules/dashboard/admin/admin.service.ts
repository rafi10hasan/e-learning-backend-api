import { IUser } from "../../user/user.interface";



const getMe = async(user:IUser)=>{
  return {
    name: user.fullName,
    email: user.email,
    avatar: user.avatar,

  }
}

export const adminService = {
    getMe
}