import api from './axios'

export async function getPosts(gymId: string, params?: { page?: number; limit?: number }) {
  const { data } = await api.get(`/gym/${gymId}/posts`, { params })
  return data
}

export async function getPost(gymId: string, postId: string) {
  const result = await getPosts(gymId)
  const post = result.data.find((p: any) => p._id === postId)
  if (!post) throw new Error('Post not found')
  return post
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
