import api from './axios'

export async function getPosts(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/posts`)
  return data
}

export async function createPost(gymId: string, postData: any) {
  const { data } = await api.post(`/gym/${gymId}/posts`, postData)
  return data
}

export async function updatePost(gymId: string, postId: string, postData: any) {
  const { data } = await api.put(`/gym/${gymId}/posts/${postId}`, postData)
  return data
}

export async function deletePost(gymId: string, postId: string) {
  const { data } = await api.delete(`/gym/${gymId}/posts/${postId}`)
  return data
}
