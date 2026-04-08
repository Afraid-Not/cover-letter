-- resumes DELETE 정책 추가
CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  USING (auth.uid() = user_id);

-- profiles 쓰기 정책 with_check 명시
DROP POLICY IF EXISTS "profiles: 본인만 쓰기" ON profiles;
CREATE POLICY "profiles: 본인만 쓰기"
  ON profiles FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
