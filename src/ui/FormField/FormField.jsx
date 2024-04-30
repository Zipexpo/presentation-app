const FormField = ({
  type,
  placeholder,
  name,
  register,
  error,
  valueAsNumber,
  title,
  subfix,
}) => (
  <>
    {title && <label className="-mb-2">{title}</label>}
    <div className="flex items-center w-full gap-1">
      <input
        className="grow"
        type={type}
        placeholder={placeholder}
        {...register(name, { valueAsNumber })}
      />
      {subfix && <span>{subfix}</span>}
    </div>
    {error && <span className="error-message">{error.message}</span>}
  </>
);
export default FormField;
