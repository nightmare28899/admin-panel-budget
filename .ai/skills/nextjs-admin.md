# Next.js & Ant Design Skills
- Use "use client" only at the leaves of the component tree. Keep layouts and page wrappers as Server Components whenever possible.
- For data tables in the admin panel, always use Ant Design's `<Table />` component. Delegate pagination, filtering, and sorting to the backend via React Query.
- Forms must be built using Ant Design's `<Form />` and `Form.useForm()`, connected to backend validation endpoints.
