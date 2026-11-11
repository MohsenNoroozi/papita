export function PagePlaceholder({
                                    title,
                                    description,
                                }: {
    title: string
    description: string
}) {
    return (
        <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-brand-deep">{title}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
    )
}