"use client";
import { useFieldArray } from "react-hook-form";
const CriteriaSelectionField = ({ name, register, error, control }) => {
  const { fields, append, remove } = useFieldArray({
    name,
    control,
  });

  return (
    <>
      {fields.map((field, index) => {
        const errorForField = error?.[index]?.quote;
        const errorForcid = error?.[index]?.cid;
        return (
          <div className="flex h-16 items-center gap-2" key={field.id}>
            <div className="w-1/4 my-32">
              <input
                {...register(`${name}.${index}.cid`)}
                placeholder="id"
                defaultValue={field.cid}
                className="border p-2 border-gray-300 w-full"
              />
              <p>{errorForcid?.message ?? <>&nbsp;</>}</p>
            </div>

            <div className="grow my-32">
              <input
                {...register(`${name}.${index}.quote`)}
                placeholder="Enter a text.."
                defaultValue={field.quote}
                className="border p-2 border-gray-300 w-full"
              />
              <p>{errorForField?.message ?? <>&nbsp;</>}</p>
            </div>

            <div className="h-full flex justify-start items-start">
              <button
                type="button"
                className="button bg-red-700 hover:bg-red-900 text-white"
                onClick={() => remove(index)}
              >
                x
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="block button button-primary"
        onClick={() =>
          append({
            cid: "",
            quote: "",
          })
        }
      >
        Append
      </button>
    </>
  );
};
export default CriteriaSelectionField;
